# Stage 1: Build React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY calorietracker.client/package*.json ./
RUN npm ci
COPY calorietracker.client/ ./
RUN npm run build

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /app
COPY CalorieTracker.Server/CalorieTracker.Server.csproj ./CalorieTracker.Server/
RUN dotnet restore ./CalorieTracker.Server/CalorieTracker.Server.csproj --no-cache
COPY CalorieTracker.Server/ ./CalorieTracker.Server/
# Copy built React app into wwwroot
COPY --from=frontend /app/dist ./CalorieTracker.Server/wwwroot/
# Disable background compiler servers to avoid SIGSEGV on low-memory hosts
RUN dotnet publish ./CalorieTracker.Server/CalorieTracker.Server.csproj \
    -c Release -o /out \
    /p:UseRazorBuildServer=false \
    /p:UseSharedCompilation=false

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=backend /out ./
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
CMD ["dotnet", "CalorieTracker.Server.dll"]
