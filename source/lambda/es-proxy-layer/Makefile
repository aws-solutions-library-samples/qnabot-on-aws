NAME=$(shell basename $(shell pwd))
DST=../../build/lambda/$(NAME).zip

RESOURCES := $(shell  find . | grep -v node_modules | grep -v test )

$(DST): $(RESOURCES) 
	echo "Building $(NAME)"; 
	node ../../bin/sync-sanitize-allowlist.js
	rm -r ./nodejs || true
	rm -r ./node_modules || true
	npm install  -production
	mkdir ./nodejs 
	mv node_modules ./nodejs/node_modules 
	# Remove unnecessary files to reduce size
	find ./nodejs/node_modules -type f -name "*.md" -delete
	find ./nodejs/node_modules -type f -name "*.ts" -delete
	find ./nodejs/node_modules -type f -name "*.map" -delete
	find ./nodejs/node_modules -type f -name "*.d.ts" -delete
	find ./nodejs/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
	find ./nodejs/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
	find ./nodejs/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true
	find ./nodejs/node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true
	find ./nodejs/node_modules -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
	rm -r $(DST) || true
	zip -r $(DST) . \
		-x "*.git*" \
		-x "*test*" \
		-x "*coverage*" \
		-x "*.md" \
		-x "*.ts" \
		-x "*.map" \
		-x "*LICENSE*" \
		-x "*CHANGELOG*" \
		-x "*.d.ts" \
		-x "*examples*" \
		-x "*docs*" \
		-x "*.eslintrc*" \
		-x "*.prettierrc*" \
		-x "*tsconfig*"