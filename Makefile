MSG="Auto_Commit"

all: up

up:
	@docker compose -f ./srcs/docker-compose.yml up -d --build

down:
	@docker compose -f ./srcs/docker-compose.yml down

clean:
	@docker compose -f ./srcs/docker-compose.yml down --rmi all

fclean: clean
	@docker system prune -af
	@docker volume prune -f
	@docker network prune -f
re: fclean all

push:
	git add . && git commit -m $(MSG) && git push

.PHONY: all down clean re