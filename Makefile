.PHONY: build deploy-local stop-local logs

build:
	docker compose build

deploy-local:
	docker compose up --build -d

stop-local:
	docker compose down

logs:
	docker compose logs -f
