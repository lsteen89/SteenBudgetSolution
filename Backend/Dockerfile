# --- build stage ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY Backend/*.csproj Backend/
# This restore command is not ideal for multi-arch. fix it by specifying the runtime.
# This is necessary to ensure that the SDK can restore the project correctly for the target architecture.
# The runtime is set to linux-arm64, which is the target architecture for this build.
RUN dotnet restore Backend/*.csproj --runtime linux-arm64

COPY Backend ./Backend
WORKDIR /src/Backend
# The output of this command goes to the "/out" directory
RUN dotnet publish -c Release -r linux-arm64 -o /out \
    /p:PublishTrimmed=false /p:PublishSingleFile=false /p:UseAppHost=false

# --- runtime stage -------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Copy from the "build" stage and from the "/out" directory.
COPY --from=build --chown=app:app /out .

# Switch to the non-root user that already exists in the base image
USER app

ENTRYPOINT ["dotnet", "Backend.dll"]
