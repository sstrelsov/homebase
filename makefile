# Variables
BUILD_DIR = build
PUBLISHED_BRANCH = published
CURRENT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD)

# Default target: Deploy
deploy: build deploy-to-published clean

# Step 1: Build the app
build:
	@echo "Building the app..."
	npm run build

# Step 2: Deploy the build to the published branch
deploy-to-published:
	@echo "Deploying to $(PUBLISHED_BRANCH) branch..."
	# Try to checkout published or create it if not exists
	@git checkout $(PUBLISHED_BRANCH) 2>/dev/null || git checkout --orphan $(PUBLISHED_BRANCH)

	# Double-check we're actually on published
	@if [ "$$(git rev-parse --abbrev-ref HEAD)" != "$(PUBLISHED_BRANCH)" ]; then \
	  echo "ERROR: Could not switch to $(PUBLISHED_BRANCH). Aborting."; \
	  exit 1; \
	fi

	@git reset --hard
	@rm -rf *
	@cp -r $(BUILD_DIR)/* .
	@git add .
	@git commit -m "Deploy from branch $(CURRENT_BRANCH)"
	@git push -u origin $(PUBLISHED_BRANCH)

# Step 3: Clean up the build folder
clean:
	@echo "Cleaning build folder..."
	@rm -rf $(BUILD_DIR)

# Rollback the last deployment on the published branch
rollback:
	@echo "Rolling back last commit on the $(PUBLISHED_BRANCH) branch..."
	@git checkout $(PUBLISHED_BRANCH)
	# Option A) "Revert" the last commit: preserves history (recommended)
	@git revert HEAD --no-edit
	@git push origin $(PUBLISHED_BRANCH)
	# Option B) or "reset" the branch to the commit before HEAD (rewrites history)
	# @git reset --hard HEAD~1
	# @git push -f origin $(PUBLISHED_BRANCH)
	@git checkout $(CURRENT_BRANCH)