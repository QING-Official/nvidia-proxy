FROM denoland/deno:1.42.0
WORKDIR /app
COPY main.ts .
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
