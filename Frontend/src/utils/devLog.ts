export const devLog = {
    group(label: string, obj?: any) {
        // keep collapsed to avoid spam in dev; expand as needed
        console.groupCollapsed(`%c${label}`, 'color:#0ea5e9;font-weight:bold');
        if (obj !== undefined) console.log(obj);
        console.groupEnd();
    },
    stamp(extra?: Record<string, unknown>) {
        return { t: new Date().toISOString(), ...extra };
    },
};