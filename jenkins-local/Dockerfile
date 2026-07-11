FROM jenkins/jenkins:lts-jdk17
USER root

# Docker CLI + Compose v2 plugin, so pipeline `sh` steps can talk to the host's
# Docker daemon (docker.sock is bind-mounted in at `docker run` time).
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker:27-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

# Kept as root so it can read the bind-mounted /var/run/docker.sock without
# fiddling with host-specific group IDs. Fine for this local/demo setup;
# not how you'd run a shared production Jenkins.
