# --- Build and Development Stage (has the SDK) ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SteenBudgetSolution.sln .
COPY Backend/ ./Backend/
RUN dotnet restore "Backend/Backend.csproj"

# This part now runs for development
WORKDIR /src/Backend
EXPOSE 8080
CMD ["dotnet", "watch", "run", "--urls", "http://*:8080"]


# --- Publish Stage (for production builds) ---
FROM build AS publish
WORKDIR "/src/Backend"
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# --- Final Production Stage (has Runtime only) ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Backend.dll"]