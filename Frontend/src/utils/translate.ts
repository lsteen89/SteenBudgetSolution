import translations from './translations';

const translate = (key: string): string => {
    return translations[key] || key; // Fallback to the key if the translation is missing
};

export default translate;
