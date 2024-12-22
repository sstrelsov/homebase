# Variables
BUILD_DIR = build
TEMP_BUILD_DIR = .temp_build
PUBLISHED_BRANCH = published
CURRENT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD)

# Default target: Deploy
deploy: build copy-build reset-published push-published clean

# Step 1: Build the app
build:
	@echo "Building the app..."
	npm run build

# Step 2: Copy build to a temporary location
copy-build:
	@echo "Copying build directory to a temporary location..."
	@rm -rf $(TEMP_BUILD_DIR)
	@cp -r $(BUILD_DIR) $(TEMP_BUILD_DIR)

# Step 3: Reset the published branch
reset-published:
	@echo "Resetting the $(PUBLISHED_BRANCH) branch to match the current build..."
	@git checkout $(PUBLISHED_BRANCH) 2>/dev/null || git checkout --orphan $(PUBLISHED_BRANCH)

	# Reset the published branch to a clean state
	@git rm -rf . 2>/dev/null || true
	@cp -r $(TEMP_BUILD_DIR)/* .
	@git add .
	@git commit -m "Deploy from branch $(CURRENT_BRANCH)" || echo "No changes to commit."

# Step 4: Push to the published branch
push-published:
	@echo "Pushing to the $(PUBLISHED_BRANCH) branch..."
	@git push origin $(PUBLISHED_BRANCH)

# Step 5: Clean up temporary files
clean:
	@echo "Cleaning up temporary files..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(TEMP_BUILD_DIR)

# Rollback the last deployment on the published branch
rollback:
	@echo "Rolling back last commit on the $(PUBLISHED_BRANCH) branch..."
	@git checkout $(PUBLISHED_BRANCH)

	# Verify we successfully switched to the published branch
	@if [ "$$(git rev-parse --abbrev-ref HEAD)" != "$(PUBLISHED_BRANCH)" ]; then \
	  echo "ERROR: Failed to switch to $(PUBLISHED_BRANCH) branch. Aborting rollback."; \
	  exit 1; \
	fi

	# Revert the last commit
	@git revert HEAD --no-edit
	@git push origin $(PUBLISHED_BRANCH)

	# Return to the original branch
	@git checkout $(CURRENT_BRANCH)