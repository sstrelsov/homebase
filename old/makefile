# Variables
BUILD_DIR       = build
PUBLISHED_BRANCH = published
WORKTREE_DIR    = ../published-branch
CURRENT_BRANCH  = $(shell git rev-parse --abbrev-ref HEAD)

# Default target
deploy: build deploy-worktree clean

# 1) Build your app
build:
	@echo "Running npm build..."
	npm run build

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