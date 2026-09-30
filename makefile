# Variables
BUILD_DIR       = build
PUBLISHED_BRANCH = published
WORKTREE_DIR    = ../published-branch
CURRENT_BRANCH  = $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: deploy build deploy-worktree clean remove-worktree phone phone-preview phone-live-data deploy-stached stached-backup stached-backup-install

# Default target
deploy: build deploy-worktree clean

# 1) Build your app
build:
	@echo "Running bun build..."
	bun run build

# 2) Deploy using a separate worktree with NO history preservation
deploy-worktree:
	@echo "Deploying to branch '$(PUBLISHED_BRANCH)' (force overwrite)..."

	# If WORKTREE_DIR doesn't exist, add it as a worktree
	@if [ ! -d "$(WORKTREE_DIR)" ]; then \
	  echo "Worktree folder not found. Creating..."; \
	  git worktree add $(WORKTREE_DIR) $(PUBLISHED_BRANCH) 2>/dev/null || \
	  ( \
	    echo "Branch '$(PUBLISHED_BRANCH)' doesn't exist. Creating orphan branch..."; \
	    git branch $(PUBLISHED_BRANCH) || true; \
	    git worktree add $(WORKTREE_DIR) $(PUBLISHED_BRANCH); \
	  ); \
	fi

	# Clear the existing files (except .git) in the worktree
	find $(WORKTREE_DIR) -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

	# Copy the new build artifacts
	cp -r $(BUILD_DIR)/* $(WORKTREE_DIR)

	# Commit and push (force) from the worktree
	cd $(WORKTREE_DIR) && \
	  git add . && \
	  git commit -m "Force deploy from branch $(CURRENT_BRANCH)" || echo "No changes to commit." && \
	  git push origin $(PUBLISHED_BRANCH) --force

	@echo "Deployment complete (force overwrite)."

# 3) Clean local build artifacts
clean:
	@echo "Cleaning up local '$(BUILD_DIR)' folder..."
	rm -rf $(BUILD_DIR)

# (Optional) Remove the worktree folder if you want a fresh start
remove-worktree:
	@echo "Removing worktree folder '$(WORKTREE_DIR)'..."
	git worktree remove $(WORKTREE_DIR) --force || true
	rm -rf $(WORKTREE_DIR)

# Play the site on your phone: local API + dev server behind Tailscale Serve,
# with a QR code to scan. See scripts/phone.sh.
phone:
	./scripts/phone.sh

# Same, but a production build, to see the link preview when you share it.
phone-preview:
	./scripts/phone.sh --preview

# Same, starting from a copy of the live database and puzzles (still throwaway).
phone-live-data:
	./scripts/phone.sh --live-data

# Ship the Stached API to the Studio: back up the database, check out the branch
# you're on here, pull it there, and restart the API (which applies any new
# migrations as it boots). Under launchd, killing the API is enough (it runs as
# sstrelsov-personal, so no sudo); a tmux stopgap session is restarted instead.
deploy-stached:
	ssh personal-studio 'set -e; export PATH=/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$$PATH; C=$$HOME/.config/stached; \
	  (umask 077; set -o pipefail; pg_dump -d stached | gzip > $$HOME/backups/stached/predeploy-$$(date +%F-%H%M).sql.gz); \
	  cd ~/dev/homebase && git fetch -q origin && git checkout -q $(CURRENT_BRANCH) && git pull -q --ff-only && git log --oneline -1; \
	  if tmux has-session -t stached-api 2>/dev/null; then \
	    tmux kill-session -t stached-api; \
	    tmux new-session -d -s stached-api "cd ~/dev/homebase/stached-api && bun --env-file=$$C/api.env server.ts 2>&1 | tee -a $$C/api.log"; \
	  else pkill -f "stached/api.env"; fi; \
	  sleep 3; curl -sf http://127.0.0.1:3999/health && echo " healthy"'

# Pull a fresh copy of the Stached database from the Studio to ~/Backups/stached.
stached-backup:
	./stached-api/ops/pull-backup.sh

# Pull that copy every day at 10am (or on wake, if this Mac was asleep then).
# The LaunchAgent runs the main checkout's script, even when installed from a
# worktree, so it outlives the worktree.
PULL_LABEL  = me.strelsov.stached-backup-pull
PULL_PLIST  = $(HOME)/Library/LaunchAgents/$(PULL_LABEL).plist
PULL_SCRIPT = $(dir $(shell git rev-parse --path-format=absolute --git-common-dir))stached-api/ops/pull-backup.sh
stached-backup-install:
	@test -f $(PULL_SCRIPT) || { echo "No $(PULL_SCRIPT) yet: update the main checkout first." >&2; exit 1; }
	@mkdir -p $(HOME)/Library/LaunchAgents $(HOME)/Backups/stached
	@printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' \
	  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
	  '<plist version="1.0"><dict>' \
	  '<key>Label</key><string>$(PULL_LABEL)</string>' \
	  '<key>ProgramArguments</key><array><string>/bin/bash</string><string>$(PULL_SCRIPT)</string></array>' \
	  '<key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>' \
	  '<key>StandardOutPath</key><string>$(HOME)/Backups/stached/pull.log</string>' \
	  '<key>StandardErrorPath</key><string>$(HOME)/Backups/stached/pull.log</string>' \
	  '</dict></plist>' > $(PULL_PLIST)
	@plutil -lint $(PULL_PLIST)
	@launchctl bootout gui/$$(id -u)/$(PULL_LABEL) 2>/dev/null || true
	@launchctl bootstrap gui/$$(id -u) $(PULL_PLIST)
	@echo "Daily Stached backup pull installed (10am). Log: ~/Backups/stached/pull.log"
