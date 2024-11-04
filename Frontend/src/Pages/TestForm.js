import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import './TestForm.css';
function TestForm() {
    const handleCaptchaChange = (token) => {
        console.log("Captcha Token:", token);
    };

    return (

        <div className="test-form-submit">

            <button type="submit">Skicka</button>
            <ReCAPTCHA
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
            />
        </div>
    );
}

export default TestForm;