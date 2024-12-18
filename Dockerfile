

##############################
# Build Stage for Production
# Stage 1: Build Stage
FROM node:20 AS build

# Set the working directory.
WORKDIR /app

# Copy the package.json to the working directory.
COPY package.json ./

# Install dependencies including devDependencies for building the app.
RUN yarn install

# Copy the rest of the application code.
COPY . .

# **Important: Remove any existing 'dist' folder**
RUN rm -rf dist

# Build the TypeScript code.
RUN yarn build

###########################
# Development stage
FROM node:20 AS dev

# Set the working directory.
WORKDIR /app

# Copy the package.json file to the working directory.
COPY package.json ./

# Install dependencies.
RUN yarn

# Copy the rest of the application code.
COPY . .

# Expose the application port.
EXPOSE 5000

# Start the application.
CMD ["yarn", "dev"]

###########################
# Production stage
FROM node:20 AS prod

# Set the working directory.
WORKDIR /app

# Copy the package.json and yarn.lock files to the working directory.
COPY package.json .env ./

# Install dependencies.
RUN yarn

# Copy only the compiled output from the build stage.
COPY --from=build /app/dist ./dist

# Expose the application port.
EXPOSE 5000

# Start the application.
CMD ["node", "dist/app.js"]
