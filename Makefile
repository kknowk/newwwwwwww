NAME = ft_transcendence

# デフォルトのターゲット
all: build up

# Dockerコンテナをビルドする
build:
	@docker-compose -p $(NAME) build

# Dockerコンテナを起動する
up:
	@docker-compose -p $(NAME) up -d

# Dockerコンテナを再起動する
re: fclean all

# Dockerコンテナを停止し、コンテナを削除する
clean:
	@docker-compose -p $(NAME) down

# Dockerコンテナとボリューム、ネットワーク、イメージを完全に削除する
fclean: clean
	@docker system prune -a --volumes -f

# Makefileのヘルプを表示する
help:
	@echo "利用可能なコマンド:"
	@echo "  all     : コンテナをビルドし、起動します。"
	@echo "  build   : コンテナをビルドします。"
	@echo "  up      : コンテナを起動します。"
	@echo "  re      : コンテナを完全に削除し、再ビルドします。"
	@echo "  clean   : コンテナを停止し、削除します。"
	@echo "  fclean  : コンテナ、ボリューム、ネットワーク、未使用イメージを削除します。"
	@echo "  help    : このヘルプメッセージを表示します。"

# デフォルトのターゲット以外のターゲットを実行する際には、
# それらのターゲットがファイル名として解釈されないようにする
.PHONY: all build up re clean fclean help

