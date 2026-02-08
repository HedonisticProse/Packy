/**
 * Expression Parser for Quantity Calculations
 *
 * Supports expressions like:
 * - d         : number of days
 * - 2d        : 2 times days
 * - d+1       : days plus 1
 * - d-1       : days minus 1
 * - 2d+1      : 2 times days plus 1
 * - d/2       : days divided by 2 (rounded up)
 * - d*2       : days times 2
 * - (d+1)/2   : grouped expressions
 */

class ExpressionParser {
    constructor() {
        // Regex to tokenize expressions
        this.tokenRegex = /(\d+d|\d+|d|[+\-*/()])/g;
    }

    /**
     * Tokenize the expression string
     * @param {string} expr - Expression like "2d+1"
     * @returns {string[]} Array of tokens
     */
    tokenize(expr) {
        const normalized = expr.replace(/\s+/g, '').toLowerCase();
        const tokens = normalized.match(this.tokenRegex);

        if (!tokens || tokens.join('') !== normalized) {
            throw new Error(`Invalid expression: ${expr}`);
        }

        return tokens;
    }

    /**
     * Parse and evaluate expression
     * @param {string} expr - Expression string
     * @param {number} days - Number of trip days
     * @returns {number} Calculated quantity
     */
    evaluate(expr, days) {
        // Handle null/undefined/empty
        if (!expr || typeof expr !== 'string') {
            return 1;
        }

        // Handle plain numbers
        const trimmed = expr.trim();
        if (/^\d+$/.test(trimmed)) {
            return parseInt(trimmed, 10);
        }

        const tokens = this.tokenize(trimmed);
        let pos = 0;

        const parseExpression = () => {
            let left = parseTerm();

            while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
                const op = tokens[pos++];
                const right = parseTerm();
                left = op === '+' ? left + right : left - right;
            }

            return left;
        };

        const parseTerm = () => {
            let left = parseFactor();

            while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
                const op = tokens[pos++];
                const right = parseFactor();
                left = op === '*' ? left * right : Math.ceil(left / right);
            }

            return left;
        };

        const parseFactor = () => {
            const token = tokens[pos++];

            if (token === '(') {
                const result = parseExpression();
                if (tokens[pos] !== ')') {
                    throw new Error('Missing closing parenthesis');
                }
                pos++;
                return result;
            }

            if (token === 'd') {
                return days;
            }

            // Handle "2d" format (coefficient * days)
            if (token.endsWith('d')) {
                const coefficient = parseInt(token.slice(0, -1), 10);
                return coefficient * days;
            }

            // Plain number
            return parseInt(token, 10);
        };

        const result = parseExpression();

        if (pos !== tokens.length) {
            throw new Error(`Unexpected token at position ${pos}`);
        }

        // Minimum 1, rounded to integer
        return Math.max(1, Math.round(result));
    }

    /**
     * Validate expression syntax without evaluating
     * @param {string} expr - Expression to validate
     * @returns {{valid: boolean, error?: string}}
     */
    validate(expr) {
        try {
            this.evaluate(expr, 1); // Test with dummy value
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    /**
     * Get human-readable description of expression
     * @param {string} expr - Expression
     * @returns {string} Description
     */
    describe(expr) {
        if (!expr) return 'single item';

        const descriptions = {
            'd': 'one per day',
            '2d': 'two per day',
            '3d': 'three per day',
            'd+1': 'one per day plus one extra',
            'd+2': 'one per day plus two extra',
            'd-1': 'one less than trip days',
            '2d+1': 'two per day plus one extra',
            '2d+2': 'two per day plus two extra',
            'd/2': 'one every two days',
            '(d+1)/2': 'half of days plus one'
        };

        const normalized = expr.toLowerCase().replace(/\s/g, '');
        return descriptions[normalized] || `calculated (${expr})`;
    }

    /**
     * Get example calculation for display
     * @param {string} expr - Expression
     * @param {number} days - Number of days
     * @returns {string} Example like "2d+1 = 11 (for 5 days)"
     */
    getExample(expr, days) {
        try {
            const result = this.evaluate(expr, days);
            return `${expr} = ${result} (for ${days} days)`;
        } catch {
            return `${expr} = invalid`;
        }
    }
}

// Singleton instance
export const expressionParser = new ExpressionParser();
