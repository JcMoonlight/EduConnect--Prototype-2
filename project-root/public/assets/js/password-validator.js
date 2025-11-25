// Password Validation Utility - International Standards
// Follows NIST, OWASP, and ISO/IEC 27001 guidelines

const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    commonPasswords: [
        'password', 'password123', '12345678', '123456789', '1234567890',
        'qwerty', 'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
        'dragon', 'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
        'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
        'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja',
        'mustang', 'password1', '123qwe', 'admin', 'root', 'user'
    ]
};

// Validate Password Strength
function validatePassword(password) {
    const errors = [];
    const warnings = [];

    // Check minimum length
    if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    }

    // Check maximum length
    if (password && password.length > PASSWORD_REQUIREMENTS.maxLength) {
        errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
    }

    if (password && password.length >= PASSWORD_REQUIREMENTS.minLength) {
        // Check for uppercase letter
        if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter (A-Z)');
        }

        // Check for lowercase letter
        if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter (a-z)');
        }

        // Check for number
        if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number (0-9)');
        }

        // Check for special character
        if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
        }

        // Check for common passwords (case-insensitive)
        const passwordLower = password.toLowerCase();
        if (PASSWORD_REQUIREMENTS.commonPasswords.some(common => passwordLower.includes(common))) {
            errors.push('Password is too common. Please choose a more unique password');
        }

        // Check for repeated characters (e.g., "aaaa" or "1111")
        if (/(.)\1{3,}/.test(password)) {
            warnings.push('Password contains repeated characters. Consider using a more varied password');
        }

        // Check for sequential characters (e.g., "1234" or "abcd")
        if (/1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz/i.test(password)) {
            warnings.push('Password contains sequential characters. Consider using a more random password');
        }

        // Recommend longer passwords
        if (password.length < 12) {
            warnings.push('For better security, consider using a password with 12 or more characters');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        strength: calculatePasswordStrength(password)
    };
}

// Calculate Password Strength
function calculatePasswordStrength(password) {
    if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
        return 'weak';
    }

    let strength = 0;

    // Length scoring
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;

    // Character variety scoring
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;

    // Deduct for common patterns
    if (PASSWORD_REQUIREMENTS.commonPasswords.some(common => password.toLowerCase().includes(common))) {
        strength -= 2;
    }

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'fair';
    if (strength <= 6) return 'good';
    return 'strong';
}

// Get Password Requirements HTML
function getPasswordRequirementsHTML() {
    return `
        <div class="password-requirements">
            <p class="requirements-title">Password Requirements:</p>
            <ul class="requirements-list">
                <li class="requirement-item" data-requirement="length">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    Minimum ${PASSWORD_REQUIREMENTS.minLength} characters
                </li>
                <li class="requirement-item" data-requirement="uppercase">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    At least one uppercase letter (A-Z)
                </li>
                <li class="requirement-item" data-requirement="lowercase">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    At least one lowercase letter (a-z)
                </li>
                <li class="requirement-item" data-requirement="number">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    At least one number (0-9)
                </li>
                <li class="requirement-item" data-requirement="special">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
                </li>
                <li class="requirement-item" data-requirement="common">
                    <svg class="requirement-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    Not a common or easily guessable password
                </li>
            </ul>
            <div class="password-strength-meter" id="passwordStrengthMeter" style="display: none;">
                <div class="strength-label">Password Strength: <span id="strengthText">-</span></div>
                <div class="strength-bar">
                    <div class="strength-fill" id="strengthFill"></div>
                </div>
            </div>
        </div>
    `;
}

// Update Password Requirements UI (real-time validation)
function updatePasswordRequirementsUI(password, requirementsContainer) {
    if (!requirementsContainer) return;

    const validation = validatePassword(password);
    const requirementItems = requirementsContainer.querySelectorAll('.requirement-item');

    requirementItems.forEach(item => {
        const requirement = item.dataset.requirement;
        const icon = item.querySelector('.requirement-icon');
        
        if (!password || password.length === 0) {
            item.classList.remove('valid', 'invalid');
            icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle>';
            return;
        }

        let isValid = false;

        switch (requirement) {
            case 'length':
                isValid = password.length >= PASSWORD_REQUIREMENTS.minLength;
                break;
            case 'uppercase':
                isValid = /[A-Z]/.test(password);
                break;
            case 'lowercase':
                isValid = /[a-z]/.test(password);
                break;
            case 'number':
                isValid = /[0-9]/.test(password);
                break;
            case 'special':
                isValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
                break;
            case 'common':
                isValid = !PASSWORD_REQUIREMENTS.commonPasswords.some(common => 
                    password.toLowerCase().includes(common)
                );
                break;
        }

        if (isValid) {
            item.classList.add('valid');
            item.classList.remove('invalid');
            icon.innerHTML = `
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            `;
        } else {
            item.classList.add('invalid');
            item.classList.remove('valid');
            icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle>';
        }
    });

    // Update strength meter
    const strengthMeter = requirementsContainer.querySelector('#passwordStrengthMeter');
    const strengthText = requirementsContainer.querySelector('#strengthText');
    const strengthFill = requirementsContainer.querySelector('#strengthFill');

    if (strengthMeter && strengthText && strengthFill) {
        if (password && password.length > 0) {
            strengthMeter.style.display = 'block';
            const strength = validation.strength;
            strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
            strengthText.className = `strength-${strength}`;
            
            strengthFill.className = `strength-fill strength-${strength}`;
            const widthMap = { weak: '25%', fair: '50%', good: '75%', strong: '100%' };
            strengthFill.style.width = widthMap[strength] || '0%';
        } else {
            strengthMeter.style.display = 'none';
        }
    }
}

// Get Password Validation Error Message
function getPasswordValidationErrorMessage(validation) {
    if (validation.isValid) {
        return '';
    }
    
    if (validation.errors.length > 0) {
        return validation.errors[0]; // Return first error
    }
    
    return 'Password does not meet requirements';
}

