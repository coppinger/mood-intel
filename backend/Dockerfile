FROM alpine:latest

# Install PocketBase
ARG PB_VERSION=0.22.20
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    curl

# Download and install PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy hooks and migrations
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations

WORKDIR /pb

# Expose PocketBase port
EXPOSE 8080

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
