<template>
    <v-empty-state
    class="text-center"
    >
    <template #media>
        <v-avatar size="48" variant="text">
            <v-icon :icon="randomPlaceholder.icon" size="32"></v-icon>
        </v-avatar>
    </template>
    
    <template v-slot:text>
        <div class="text-medium-emphasis text-body-medium">
            {{ randomPlaceholder.label }}
        </div>
    </template>
</v-empty-state>

</template>

<script setup>
const placeholders = [
{
    label: 'Smart notes. Sharper thinking. What are we working on today?',
    icon: 'ph-brain'
},
{
    label: 'Your knowledge, ready when you are',
    icon: 'ph-rocket-launch'
},
{
    label: 'Your ideas, organized and ready to grow',
    icon: 'ph-plant'
},
{
    label: 'From scattered notes to sharper answers',
    icon: 'ph-compass'
},
{
    label: 'Turn your notes into your next clear step',
    icon: 'ph-footprints'
},
{
    label: 'Small notes. Big ideas. Where do we start?',
    icon: 'ph-lightbulb'
},
{
    label: 'Find the insight hiding in your notes',
    icon: 'ph-binoculars'
},
{
    label: 'What should we make clearer today?',
    icon: 'ph-sun'
},
{
    label: 'Turn ideas into structure',
    icon: 'ph-flow-arrow'
},
{
    label: 'Better notes. Better focus. Better work',
    icon: 'ph-target'
}
]
const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)] 

</script>