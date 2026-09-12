<template>
    <v-app>
        <MainWindoView />
    </v-app>
</template>

<script setup>
import MainWindoView from './views/MainWindowView.vue';
</script>

<style>
.delete-menu-action:hover {
    background-color: rgba(var(--v-theme-error), var(--v-activated-opacity));
}
</style>
