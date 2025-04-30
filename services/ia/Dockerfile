# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if they exist
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Set the environment variable to production
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "index.js"]
