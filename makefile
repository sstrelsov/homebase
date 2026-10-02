.PHONY: phone phone-preview phone-live-data deploy-stached stached-backup stached-backup-install

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
CURRENT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD)
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
