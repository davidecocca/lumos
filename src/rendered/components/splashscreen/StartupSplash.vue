<template>
    <v-fade-transition>
        <div v-if="visible" class="startup-splash" role="status">
            <div class="startup-splash__particles" aria-hidden="true">
                <span v-for="particle in 12" :key="particle" />
            </div>
            <div class="startup-splash__content">
                <img :src="appLogo" alt="" class="startup-splash__logo" />
                <div class="text-headline-small font-weight-semibold mt-6">
                    Lumos
                </div>
                <div class="text-body-medium text-medium-emphasis mt-2">
                    {{ message }}
                </div>
            </div>
        </div>
    </v-fade-transition>
</template>

<script setup>
import appLogo from '../../assets/app_logo.png';

const messages = [
    'Getting things ready...',
    'Lighting things up…',
    'Setting the stage…',
    'Warming up the magic…',
    'Making a little magic…',
    'Almost ready…',
];
const message = messages[Math.floor(Math.random() * messages.length)];

defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
});
</script>

<style scoped>
.startup-splash {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: grid;
    place-items: center;
    background-color: rgb(var(--v-theme-background));
    background-image: radial-gradient(
        circle at center,
        rgba(var(--v-theme-primary), 0.3) 0%,
        rgba(var(--v-theme-primary), 0.12) 42%,
        transparent 72%
    );
}

.startup-splash__content {
    position: relative;
    z-index: 1;
    width: min(240px, calc(100vw - 48px));
    text-align: center;
}

.startup-splash__particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

.startup-splash__particles span {
    position: absolute;
    width: 10px;
    height: 10px;
    opacity: 0;
    background: rgba(var(--v-theme-primary), 0.72);
    clip-path: polygon(
        50% 0,
        62% 38%,
        100% 50%,
        62% 62%,
        50% 100%,
        38% 62%,
        0 50%,
        38% 38%
    );
    animation: startup-particle 6s ease-in-out infinite;
}

.startup-splash__particles span:nth-child(1) {
    top: 20%;
    left: 18%;
    animation-delay: 0s;
}

.startup-splash__particles span:nth-child(2) {
    top: 24%;
    left: 76%;
    animation-delay: -1.4s;
}

.startup-splash__particles span:nth-child(3) {
    top: 68%;
    left: 14%;
    animation-delay: -2.3s;
}

.startup-splash__particles span:nth-child(4) {
    top: 72%;
    left: 82%;
    animation-delay: -3.6s;
}

.startup-splash__particles span:nth-child(5) {
    top: 12%;
    left: 48%;
    animation-delay: -4.2s;
}

.startup-splash__particles span:nth-child(6) {
    top: 84%;
    left: 52%;
    animation-delay: -5.1s;
}

.startup-splash__particles span:nth-child(7) {
    top: 44%;
    left: 6%;
    animation-delay: -0.8s;
}

.startup-splash__particles span:nth-child(8) {
    top: 46%;
    left: 92%;
    animation-delay: -2.9s;
}

.startup-splash__particles span:nth-child(9) {
    top: 34%;
    left: 30%;
    animation-delay: -4.7s;
}

.startup-splash__particles span:nth-child(10) {
    top: 60%;
    left: 70%;
    animation-delay: -1.9s;
}

.startup-splash__particles span:nth-child(11) {
    top: 10%;
    left: 88%;
    animation-delay: -3.2s;
}

.startup-splash__particles span:nth-child(12) {
    top: 90%;
    left: 28%;
    animation-delay: -5.6s;
}

.startup-splash__logo {
    width: 120px;
    height: 120px;
    animation: startup-logo-pulse 1.8s ease-in-out infinite;
}

@keyframes startup-logo-pulse {
    0%,
    100% {
        opacity: 0.82;
        transform: scale(0.96);
    }

    50% {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes startup-particle {
    0%,
    100% {
        opacity: 0;
        transform: translateY(12px) scale(0.5) rotate(0deg);
    }

    45% {
        opacity: 0.8;
        transform: translateY(-8px) scale(1) rotate(45deg);
    }

    65% {
        opacity: 0.3;
        transform: translateY(-16px) scale(0.7) rotate(90deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .startup-splash__logo,
    .startup-splash__particles span {
        animation: none;
    }
}
</style>
