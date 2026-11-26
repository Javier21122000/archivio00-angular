# Non ancora provato: Docker non e' installato sul Mac di sviluppo, quindi questo file non e' mai stato costruito.
# Multi-stage: lo stage "build" ha le devDependencies (nest, typescript) per compilare;
# l'immagine finale contiene solo le dipendenze di produzione e la cartella dist/.

FROM node:24-alpine AS build
WORKDIR /app
# Prima i soli manifest: se non cambiano, Docker riusa la cache di "npm ci".
COPY package.json package-lock.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Non girare come root dentro il container.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
