FROM node:current-alpine as builder
# Install pnpm
RUN npm install -g pnpm

# ENV NODE_ENV=production
WORKDIR /app

# copy dependencies & install without modifications
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# copy source code

COPY src ./src
COPY static ./static

# copy svelte config giles
COPY svelte.config.js vite.config.ts tsconfig.json ./

# copy tailwind & postcss config files
COPY tailwind.config.js postcss.config.js ./

# build app
RUN pnpm run build

# copy builder files to production image
FROM scratch as production
COPY --from=builder /app/build /app/build
