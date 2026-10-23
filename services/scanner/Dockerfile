FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /var/task

# Chromium is included in the Playwright image. aws-lambda-ric is the
# container Lambda interface.
RUN npm install --omit=dev aws-lambda-ric

COPY lambda.cjs ./lambda.cjs
COPY src ./src
COPY trackers.json ./trackers.json
COPY fixtures ./fixtures

ENTRYPOINT ["/var/task/node_modules/.bin/aws-lambda-ric"]
CMD ["lambda.handler"]
