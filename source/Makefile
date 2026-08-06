define check_poetry
    $(shell if command -v poetry >/dev/null 2>&1; then \
        echo "poetry"; \
    elif [ -n "$(POETRY_HOME)" ] && [ -x "$(POETRY_HOME)/bin/poetry" ]; then \
        echo "$(POETRY_HOME)/bin/poetry"; \
    else \
        echo "ERROR_NO_POETRY"; \
    fi)
endef

export POETRY_COMMAND := $(call check_poetry)

ifeq ($(POETRY_COMMAND),ERROR_NO_POETRY)
    $(error Poetry is not available. Aborting.)
endif

# Export runtime versions from package.json config
export npm_package_config_lambdaRuntime := nodejs24.x
export npm_package_config_pythonRuntime := python3.14

TEMPLATES=$(shell for l in $$(ls ./templates | egrep -v "util|lib|README.md|jest.config.js|package.json|package-lock.json|node_modules|coverage|__tests__|__mocks__|.pytest_cache|.venv-test|pytest.ini|requirements.txt|requirements-test.txt");do echo templates/$$l;done)

All: assets templates lambda website make_directories

build: All

make_directories:
	mkdir -p build/lambda build/documents build/templates/test  build/templates/dev

.PHONY: lambda templates upload website test bootstrap assets config.aws-solutions.json sync-allowlist
.PHONY: $(TEMPLATES)

config.json:
	node bin/config.js > config.json

config.aws-solutions.json:
	node bin/config.js buildType=AWSSolutions > config.json

# Regenerates sanitizeOutput.js in es-proxy-layer and website from
# sanitizeAllowlist.js (also in bin/). See bin/README.md.
sync-allowlist:
	node bin/sync-sanitize-allowlist.js

lambda: make_directories sync-allowlist
	make -C ./lambda

bootstrap: make_directories
	$(MAKE) ../../build/templates/dev/bootstrap.json -C templates/dev

templates: $(TEMPLATES)

$(TEMPLATES): make_directories
	$(MAKE) -C $@

website: make_directories sync-allowlist
	$(MAKE) -C ./website

assets: make_directories
	$(MAKE) -C ./assets

samples:docs/blog-samples.json make_directories
	cp docs/blog-samples.json build/documents

upload: templates lambda website make_directories assets
	./bin/upload.sh

test: make_directories
	$(MAKE) -C test
