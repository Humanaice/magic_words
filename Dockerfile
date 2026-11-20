# check=skip=SecretsUsedInArgOrEnv
# (The Supabase anon key is public by design: it ships in the browser bundle and RLS protects the data.)
# Magic Words: static build served by nginx.
#
#   docker build -t magic-words .
#   docker run --rm -p 8080:80 magic-words      # http://localhost:8080
#
# Online leaderboard (optional): pass the Supabase values at build time
# (they end up in the public JavaScript, like on GitHub Pages):
#   docker build -t magic-words \
#     --build-arg VITE_SUPABASE_URL=https://xxxx.supabase.co \
#     --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_BASE_PATH="/"
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build

FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
