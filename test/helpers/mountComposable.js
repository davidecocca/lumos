// Exercise real Vue refs/watchers/lifecycle without a browser or additional dependencies.
module.exports = async function mountComposable(setup) {
    const { createRenderer } = await import('vue');
    const renderer = createRenderer({
        createComment: () => ({}),
        insert() {},
        remove() {},
        parentNode: () => null,
        nextSibling: () => null,
    });
    let result;
    const app = renderer.createApp({
        setup() {
            result = setup();
            return () => null;
        },
    });
    app.mount({});
    let mounted = true;
    return {
        result,
        unmount: () => {
            if (mounted) app.unmount();
            mounted = false;
        },
    };
};
