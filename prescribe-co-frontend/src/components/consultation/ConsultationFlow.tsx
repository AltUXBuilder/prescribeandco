'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { questionnairesService } from '@/lib/api'
import type { QuestionSchema, QuestionnaireSchema } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Step definitions ────────────────────────────────────────────────────────

interface Step {
  id:    string
  label: string
}

const FLOW_STEPS: Step[] = [
  { id: 'product',    label: 'Product'     },
  { id: 'health',     label: 'Health Check'},
  { id: 'review',     label: 'Review'      },
  { id: 'payment',    label: 'Payment'     },
]

// ── Progress indicator ──────────────────────────────────────────────────────

function ProgressBar({
  steps,
  currentStep,
}: {
  steps:       Step[]
  currentStep: number
}) {
  return (
    <div className="px-8 py-6 border-b border-[var(--grid-line)]">
      {/* Step labels */}
      <div className="flex items-center gap-0 mb-4">
        {steps.map((step, i) => {
          const done    = i < currentStep
          const active  = i === currentStep
          const pending = i > currentStep
          return (
            <div
              key={step.id}
              className="flex items-center gap-2 flex-1"
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Step circle */}
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    'text-[10px] font-medium transition-all duration-300',
                    'border',
                    done    && 'bg-sage-soft border-sage text-sage-deep',
                    active  && 'bg-brand-lavenderSoft border-brand-lavender text-brand-lavenderDark',
                    pending && 'bg-white border-[var(--grid-line)] text-charcoal-muted',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <Check size={10} strokeWidth={2.5} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] tracking-[0.04em] uppercase whitespace-nowrap',
                    done   && 'text-sage-deep font-medium',
                    active && 'text-charcoal font-medium',
                    pending&& 'text-charcoal-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line — except after last */}
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-[var(--grid-line)] mx-3 flex-shrink">
                  <div
                    className="h-full bg-brand-lavender transition-all duration-500 rounded-full"
                    style={{ width: i < currentStep ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Thin overall progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
          aria-valuenow={(currentStep / (steps.length - 1)) * 100}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label="Consultation progress"
        />
      </div>
    </div>
  )
}

// ── Question renderer ───────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: QuestionSchema
  value:    unknown
  onChange: (v: unknown) => void
}) {
  if (question.type === 'BOOLEAN') {
    return (
      <div className="flex flex-col gap-3">
        {[
          { label: 'Yes', value: true  },
          { label: 'No',  value: false },
        ].map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-4 px-5 py-4 rounded-xl border',
              'text-left transition-all duration-200 font-sans',
              value === opt.value
                ? 'bg-brand-lavenderSoft border-brand-lavender shadow-brand-glow'
                : 'bg-white border-[var(--grid-line)] hover:bg-brand-lavenderSoft hover:border-[var(--grid-hover)]',
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0',
                'transition-all duration-200',
                value === opt.value
                  ? 'border-brand-lavenderDark bg-brand-lavenderDark'
                  : 'border-[var(--grid-line)] bg-white',
              )}
            >
              {value === opt.value && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span className="text-[14px] font-medium text-charcoal">{opt.label}</span>
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'SINGLE_CHOICE' && question.options) {
    return (
      <div className="flex flex-col gap-3">
        {question.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-4 px-5 py-4 rounded-xl border',
              'text-left transition-all duration-200 font-sans',
              value === opt.value
                ? 'bg-brand-lavenderSoft border-brand-lavender shadow-brand-glow'
                : 'bg-white border-[var(--grid-line)] hover:bg-brand-lavenderSoft hover:border-[var(--grid-hover)]',
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0',
                'transition-all duration-200',
                value === opt.value
                  ? 'border-brand-lavenderDark bg-brand-lavenderDark'
                  : 'border-[var(--grid-line)] bg-white',
              )}
            >
              {value === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div>
              <div className="text-[14px] font-medium text-charcoal">{opt.label}</div>
              {opt.disqualifying && (
                <div className="text-[11px] text-charcoal-muted mt-0.5">May affect eligibility</div>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'TEXT') {
    return (
      <textarea
        value={(value as string) ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Type your answer here…"
        rows={4}
        className="input-medical resize-none"
        aria-label={question.text}
      />
    )
  }

  if (question.type === 'SCALE' && question.scale) {
    const { min, max } = question.scale
    const current = (value as number) ?? min
    return (
      <div>
        <div className="flex justify-between text-[11px] text-charcoal-muted mb-3">
          <span>{question.scale.minLabel ?? min}</span>
          <span>{question.scale.maxLabel ?? max}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={current}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1 bg-cream-deep rounded-full appearance-none
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-brand-lavender
                     [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                     [&::-webkit-slider-thumb]:shadow-soft cursor-pointer"
          aria-label={question.text}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
        />
        <div className="text-center mt-3 font-serif text-2xl font-medium text-charcoal">
          {current}
        </div>
      </div>
    )
  }

  return null
}

// ── Main consultation flow ──────────────────────────────────────────────────

interface ConsultationFlowProps {
  productId:      string
  schema:         QuestionnaireSchema
  questionnaireId:string
  token:          string
  onComplete: (responseId: string, isEligible: boolean) => void
}

export function ConsultationFlow({
  productId,
  schema,
  questionnaireId,
  token,
  onComplete,
}: ConsultationFlowProps) {
  const questions = schema.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const [stepIndex, setStepIndex] = useState(0)
  const [answers,   setAnswers]   = useState<Record<string, unknown>>({})
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const currentQ   = questions[stepIndex]
  const totalQ     = questions.length
  const answer     = answers[currentQ?.id]
  const hasAnswer  = answer !== undefined && answer !== ''
  const isLastQ    = stepIndex === totalQ - 1

  // Respect showIf conditional logic
  const isVisible = useCallback((q: QuestionSchema): boolean => {
    if (!q.showIf) return true
    const { questionId, operator, value } = q.showIf
    const parentAnswer = answers[questionId]
    if (operator === 'eq')    return String(parentAnswer) === String(value)
    if (operator === 'neq')   return String(parentAnswer) !== String(value)
    if (operator === 'in')    return Array.isArray(value) && value.includes(parentAnswer as string)
    if (operator === 'not_in')return Array.isArray(value) && !value.includes(parentAnswer as string)
    return true
  }, [answers])

  const handleNext = useCallback(async () => {
    // Find next visible question
    let nextIdx = stepIndex + 1
    while (nextIdx < totalQ && !isVisible(questions[nextIdx])) nextIdx++

    if (nextIdx < totalQ) {
      setStepIndex(nextIdx)
      return
    }

    // All questions answered — submit
    setLoading(true)
    setError(null)

    try {
      const result = await questionnairesService.respond(
        questionnaireId,
        answers,
        token,
      )
      onComplete(result.id, result.isEligible)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [stepIndex, totalQ, questions, isVisible, answers, questionnaireId, token, onComplete])

  const handleBack = useCallback(() => {
    let prevIdx = stepIndex - 1
    while (prevIdx >= 0 && !isVisible(questions[prevIdx])) prevIdx--
    if (prevIdx >= 0) setStepIndex(prevIdx)
  }, [stepIndex, questions, isVisible])

  // Overall step in the 4-step flow (health check = step index 1)
  const overallStep = 1

  if (!currentQ) return null

  return (
    <div className="bg-white border border-[var(--grid-line)] rounded-xl overflow-hidden max-w-xl mx-auto">

      {/* Progress */}
      <ProgressBar steps={FLOW_STEPS} currentStep={overallStep} />

      {/* Question body */}
      <div className="px-8 py-8">
        {/* Question number */}
        <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-charcoal-muted mb-2">
          Question {stepIndex + 1} of {totalQ}
        </p>

        {/* Question text */}
        <h2 className="font-serif text-[20px] font-medium text-charcoal leading-snug mb-2">
          {currentQ.text}
        </h2>

        {/* Hint */}
        {currentQ.hint && (
          <p className="text-[13px] text-charcoal-muted leading-relaxed mb-7">
            {currentQ.hint}
          </p>
        )}
        {!currentQ.hint && <div className="mb-7" />}

        {/* Question input */}
        <div className="mb-2">
          <QuestionRenderer
            question={currentQ}
            value={answer}
            onChange={v => setAnswers(prev => ({ ...prev, [currentQ.id]: v }))}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-[13px] text-[#8A4040] bg-[#FBF0F0] border border-[#DDABAB]
                        px-4 py-3 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Footer navigation */}
      <div className="px-8 py-5 border-t border-[var(--grid-line)] flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={stepIndex === 0}
          className={cn(
            'flex items-center gap-1.5 text-[13px] font-medium',
            'text-charcoal-muted hover:text-charcoal transition-colors',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          aria-label="Previous question"
        >
          <ChevronLeft size={15} strokeWidth={1.5} />
          Back
        </button>

        <p className="text-[11px] text-charcoal-muted">
          {Math.round(((stepIndex + 1) / totalQ) * 100)}% complete
        </p>

        <button
          onClick={handleNext}
          disabled={!hasAnswer || loading}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5',
            'bg-charcoal text-white text-[13px] font-medium rounded-lg',
            'border border-charcoal transition-all duration-200',
            'hover:bg-charcoal-medium',
            'disabled:bg-cream-deep disabled:text-charcoal-muted disabled:border-[var(--grid-line)]',
            'disabled:cursor-not-allowed',
          )}
          aria-label={isLastQ ? 'Submit consultation' : 'Next question'}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
              Submitting…
            </span>
          ) : (
            <>
              {isLastQ ? 'Submit' : 'Continue'}
              <ChevronRight size={14} strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
