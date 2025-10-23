FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy static site assets
COPY front /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

