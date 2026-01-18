import type { UserProfile } from '@/lib/schemas/core';
import type { PolicyParameters, CalculationFormula } from '@/lib/schemas/policy-parameters';
import type {
  ImpactCalculationResult,
  CalculationStep,
  Caveat,
  MissingInput,
} from '@/lib/schemas/impact-calculation';

// ============================================
// Profile Field Labels
// ============================================

const FIELD_LABELS: Record<string, string> = {
  household_income: 'Household Income',
  individual_income: 'Individual Income',
  age: 'Age',
  state: 'State',
  household_size: 'Household Size',
  tax_filing_status: 'Tax Filing Status',
  employment_status: 'Employment Status',
  insurance_status: 'Insurance Status',
  student_status: 'Student Status',
  rent_vs_own: 'Housing Status',
  annual_housing_payment: 'Annual Housing Payment',
  student_loan_balance: 'Student Loan Balance',
};

// ============================================
// Safe Expression Evaluator (No eval/Function)
// Uses recursive descent parsing for safety
// ============================================

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'function'; value: string };

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

function tokenize(expression: string, variables: Record<string, number>): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(char) || (char === '.' && /\d/.test(expression[i + 1] || ''))) {
      let numStr = '';
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        numStr += expression[i];
        i++;
      }
      const value = parseFloat(numStr);
      if (isNaN(value)) return null;
      tokens.push({ type: 'number', value });
      continue;
    }

    // Operators
    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    // Comma (for function arguments)
    if (char === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    // Identifiers (variables or functions)
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < expression.length && /[a-zA-Z_0-9]/.test(expression[i])) {
        ident += expression[i];
        i++;
      }

      // Check if it's a known math function
      if (ident.toLowerCase() in MATH_FUNCTIONS) {
        tokens.push({ type: 'function', value: ident.toLowerCase() });
      }
      // Check if it's a variable
      else if (ident in variables) {
        tokens.push({ type: 'number', value: variables[ident] });
      }
      else {
        console.warn('Unknown identifier in expression:', ident);
        return null;
      }
      continue;
    }

    // Unknown character
    console.warn('Invalid character in expression:', char);
    return null;
  }

  return tokens;
}

class SafeExpressionParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private expect(type: Token['type']): Token {
    const token = this.consume();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type}`);
    }
    return token;
  }

  // Grammar: expr -> term (('+' | '-') term)*
  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected tokens after expression');
    }
    return result;
  }

  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.peek()?.type === 'operator' && ['+', '-'].includes((this.peek() as { value: string }).value)) {
      const op = (this.consume() as { value: string }).value;
      const right = this.parseTerm();
      left = op === '+' ? left + right : left - right;
    }

    return left;
  }

  // Grammar: term -> factor (('*' | '/') factor)*
  private parseTerm(): number {
    let left = this.parseFactor();

    while (this.peek()?.type === 'operator' && ['*', '/'].includes((this.peek() as { value: string }).value)) {
      const op = (this.consume() as { value: string }).value;
      const right = this.parseFactor();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }

    return left;
  }

  // Grammar: factor -> number | '(' expr ')' | '-' factor | function '(' args ')'
  private parseFactor(): number {
    const token = this.peek();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    // Unary minus
    if (token.type === 'operator' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }

    // Unary plus
    if (token.type === 'operator' && token.value === '+') {
      this.consume();
      return this.parseFactor();
    }

    // Number
    if (token.type === 'number') {
      this.consume();
      return token.value;
    }

    // Parenthesized expression
    if (token.type === 'paren' && token.value === '(') {
      this.consume();
      const result = this.parseExpression();
      this.expect('paren'); // closing paren
      return result;
    }

    // Function call
    if (token.type === 'function') {
      const funcName = token.value;
      this.consume();
      this.expect('paren'); // opening paren

      const args: number[] = [];
      if (this.peek()?.type !== 'paren' || (this.peek() as { value: string }).value !== ')') {
        args.push(this.parseExpression());
        while (this.peek()?.type === 'comma') {
          this.consume();
          args.push(this.parseExpression());
        }
      }

      this.expect('paren'); // closing paren

      const func = MATH_FUNCTIONS[funcName];
      if (!func) {
        throw new Error(`Unknown function: ${funcName}`);
      }
      return func(...args);
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
}

function evaluateExpression(
  expression: string,
  variables: Record<string, number | string>
): number | null {
  try {
    // Convert string variables to numbers
    const numericVariables: Record<string, number> = {};
    for (const [key, value] of Object.entries(variables)) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        numericVariables[key] = numValue;
      }
    }

    // Tokenize the expression
    const tokens = tokenize(expression, numericVariables);
    if (!tokens) {
      return null;
    }

    // Parse and evaluate
    const parser = new SafeExpressionParser(tokens);
    const result = parser.parse();

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return null;
    }

    return result;
  } catch (error) {
    console.error('Expression evaluation error:', error);
    return null;
  }
}

// ============================================
// Check Required Inputs
// ============================================

function checkRequiredInputs(
  profile: UserProfile,
  requiredInputs: string[]
): MissingInput[] {
  const missing: MissingInput[] = [];

  for (const input of requiredInputs) {
    const profileKey = input as keyof UserProfile;
    const value = profile[profileKey];

    if (value === undefined || value === null || value === '') {
      missing.push({
        field: input,
        fieldLabel: FIELD_LABELS[input] || input,
        reason: `Required for impact calculation`,
        impact: 'Cannot compute accurate impact without this information',
        isRequired: true,
      });
    }
  }

  return missing;
}

// ============================================
// Extract Profile Variables
// ============================================

function extractProfileVariables(profile: UserProfile): Record<string, number | string> {
  const variables: Record<string, number | string> = {};

  // Numeric fields
  if (profile.household_income !== undefined) variables.household_income = profile.household_income;
  if (profile.individual_income !== undefined) variables.individual_income = profile.individual_income;
  if (profile.age !== undefined) variables.age = profile.age;
  if (profile.household_size !== undefined) variables.household_size = profile.household_size;
  if (profile.annual_housing_payment !== undefined) variables.annual_housing_payment = profile.annual_housing_payment;
  if (profile.student_loan_balance !== undefined) variables.student_loan_balance = profile.student_loan_balance;
  if (profile.other_debts !== undefined) variables.other_debts = profile.other_debts;
  if (profile.dependents_covered !== undefined) variables.dependents_covered = profile.dependents_covered;

  // String fields (for conditional logic)
  if (profile.state) variables.state = profile.state;
  if (profile.tax_filing_status) variables.tax_filing_status = profile.tax_filing_status;
  if (profile.employment_status) variables.employment_status = profile.employment_status;
  if (profile.insurance_status) variables.insurance_status = profile.insurance_status;
  if (profile.student_status) variables.student_status = profile.student_status;
  if (profile.rent_vs_own) variables.rent_vs_own = profile.rent_vs_own;

  return variables;
}

// ============================================
// Main Impact Calculation Function
// ============================================

export function calculateImpact(
  profile: UserProfile,
  parameters: PolicyParameters,
  formulas: CalculationFormula[]
): ImpactCalculationResult {
  // If no formulas, we can't compute
  if (!formulas || formulas.length === 0) {
    return {
      calculationStatus: 'cannot_compute',
      reason: 'No calculation formulas available for this policy',
      missingInputs: [],
    };
  }

  // Use the first formula (primary impact calculation)
  const primaryFormula = formulas[0];

  // Check for missing inputs
  const missingInputs = checkRequiredInputs(profile, primaryFormula.requiredInputs);

  if (missingInputs.length > 0) {
    return {
      calculationStatus: 'cannot_compute',
      reason: `Missing required profile information: ${missingInputs.map(m => m.fieldLabel).join(', ')}`,
      missingInputs,
      partialAnalysis: `This policy calculation requires: ${primaryFormula.requiredInputs.join(', ')}`,
    };
  }

  // Extract variables from profile
  const variables = extractProfileVariables(profile);

  // Build calculation steps
  const steps: CalculationStep[] = [];
  let finalResult: number | null = null;

  // Execute each formula
  for (let i = 0; i < formulas.length; i++) {
    const formula = formulas[i];
    const result = evaluateExpression(formula.expression, variables);

    if (result === null) {
      return {
        calculationStatus: 'cannot_compute',
        reason: `Failed to evaluate formula: ${formula.name}`,
        missingInputs: [],
      };
    }

    // Store intermediate result for next formula
    variables[formula.formulaId] = result;

    steps.push({
      stepNumber: i + 1,
      description: formula.description,
      formula: formula.expression,
      inputs: Object.fromEntries(
        formula.requiredInputs.map(input => [input, variables[input] || 0])
      ),
      result,
      unit: formula.outputUnit,
    });

    // Last formula result is the final result
    if (i === formulas.length - 1) {
      finalResult = result;
    }
  }

  if (finalResult === null) {
    return {
      calculationStatus: 'cannot_compute',
      reason: 'Calculation did not produce a result',
      missingInputs: [],
    };
  }

  // Determine impact direction based on formula semantics
  // 'benefit' = positive result is good for user (savings)
  // 'burden' = positive result is bad for user (costs)
  const semantics = primaryFormula.impactSemantics || 'benefit';
  let impactDirection: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';

  if (Math.abs(finalResult) <= 100) {
    // Small impact - treat as neutral
    impactDirection = finalResult !== 0 ? (finalResult > 0 ? (semantics === 'benefit' ? 'positive' : 'negative') : (semantics === 'benefit' ? 'negative' : 'positive')) : 'neutral';
  } else if (semantics === 'benefit') {
    // Positive number = savings (positive for user)
    impactDirection = finalResult > 0 ? 'positive' : 'negative';
  } else {
    // semantics === 'burden': Positive number = costs (negative for user)
    impactDirection = finalResult > 0 ? 'negative' : 'positive';
  }

  // Build caveats
  const caveats: Caveat[] = [];

  // Add caveat if using estimated values
  if (!profile.household_income && profile.individual_income) {
    caveats.push({
      type: 'assumption',
      description: 'Household income estimated from individual income',
      severity: 'medium',
      affectsConfidence: true,
    });
  }

  // Add caveat about policy uncertainty
  if (!parameters.effectiveDate) {
    caveats.push({
      type: 'policy_uncertainty',
      description: 'Policy effective date not specified',
      severity: 'low',
      affectsConfidence: false,
    });
  }

  return {
    calculationStatus: 'computed',
    primaryImpactValue: Math.round(finalResult * 100) / 100,
    impactUnit: primaryFormula.outputUnit === 'dollars' ? 'dollars_annual' : 'percentage',
    impactDirection,
    calculationBreakdown: {
      steps,
      inputsUsed: Object.fromEntries(
        Object.entries(variables).filter(([key]) =>
          primaryFormula.requiredInputs.includes(key)
        )
      ),
      formulaUsed: primaryFormula.expression,
    },
    caveats,
    confidenceLevel: caveats.length === 0 ? 0.9 : 0.7,
  };
}

// ============================================
// Generate Impact Headline
// ============================================

export function generateImpactHeadline(result: ImpactCalculationResult): string {
  if (result.calculationStatus === 'cannot_compute') {
    return 'Unable to calculate personal impact';
  }

  const value = result.primaryImpactValue;
  const unit = result.impactUnit;
  const direction = result.impactDirection;

  const formattedValue = Math.abs(value).toLocaleString('en-US', {
    style: unit.startsWith('dollars') ? 'currency' : 'decimal',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  if (direction === 'positive') {
    return `You could save ${formattedValue}${unit === 'dollars_annual' ? '/year' : ''}`;
  } else if (direction === 'negative') {
    return `This could cost you ${formattedValue}${unit === 'dollars_annual' ? '/year' : ''}`;
  } else {
    return `Minimal impact on your finances`;
  }
}
