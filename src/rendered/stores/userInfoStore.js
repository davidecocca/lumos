import { defineStore } from 'pinia'

export const userInfoStore = defineStore('userInfoStore', {
    state: () => ({
        userName: null
    }),
    
    actions: {
        // Load user info from localStorage
        loadUserInfo() {
            const savedInfo = localStorage.getItem('lumosUserInfo')
            if (savedInfo) {
                const userInfo = JSON.parse(savedInfo)

                // Load user name
                this.userName = userInfo.userName || this.userName
            }
        },
        
        // Save user info to localStorage
        saveUserInfo() {
            const userInfo = {
                userName: this.userName
            }

            localStorage.setItem('lumosUserInfo', JSON.stringify(userInfo))
        },
        
        // Reset user information
        resetUserInfo() {
            this.userName = null
            this.saveUserInfo()
        },
    }
})