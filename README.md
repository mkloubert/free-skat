# FreeSkat

> Re-Written version of [jSkat](https://www.jskat.org) with modern and platform independent web technologies.

## Development

```bash
cd app

npm start
```

### Claude Code

```bash
# build Dockerfile.claude-code
# with latest version of Claude Code
docker compose -f ./docker-compose.claude-code.yaml build --no-cache

# run container in background
docker compose -f ./docker-compose.claude-code.yaml up -d

# execute "claude" in container
docker compose -f ./docker-compose.claude-code.yaml exec dev claude


# stop container
# docker compose -f ./docker-compose.claude-code.yaml down
# restart container
# docker compose -f ./docker-compose.claude-code.yaml restart
```

## License

[Apache License, Version 2.0](./LICENSE)
