FROM archlinux AS certs
WORKDIR /tmp/certs
RUN pacman -Sy --noconfirm openssl
RUN pacman -Sy --noconfirm expect
COPY ./certs.sh ./
RUN chmod +x ./certs.sh
RUN ./certs.sh
RUN rm -rf ./certs.sh

FROM archlinux
WORKDIR /tmp/builder
COPY ./back     /tmp/builder/back
COPY ./front    /tmp/builder/front
COPY --from=certs /tmp/certs /tmp/builder/back/certs
# select Japan mirror
RUN echo 'Server = https://mirror.cat.net/archlinux/$repo/os/$arch' > /etc/pacman.d/mirrorlist
RUN pacman -Sy --noconfirm nodejs
RUN pacman -Sy --noconfirm npm
WORKDIR /tmp/builder/back
RUN npm i
RUN npm run def
WORKDIR /tmp/builder/front
RUN npm i
RUN npm run build
WORKDIR /tmp/builder/back
CMD npm run start