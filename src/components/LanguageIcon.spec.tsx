import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LanguageIcon } from './LanguageIcon'

describe('LanguageIcon', () => {
    it('renders correct devicon class for known languages', () => {
        const { container } = render(<LanguageIcon name="JavaScript" />)
        const icon = container.querySelector('i')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('devicon-javascript-plain')
    })

    it('renders correct devicon class for mapped languages', () => {
        const { container } = render(<LanguageIcon name="C#" />)
        const icon = container.querySelector('i')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('devicon-csharp-plain')
    })

    it('renders correct devicon class for fuzzy match', () => {
        const { container } = render(<LanguageIcon name="Vue" />)
        const icon = container.querySelector('i')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('devicon-vuejs-plain')
    })

    it('renders fallback SVG for unknown languages', () => {
        const { container } = render(<LanguageIcon name="UnknownLanguage123" />)
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
        expect(container.querySelector('i')).not.toBeInTheDocument()
    })

    it('renders colored class when no color prop provided', () => {
        const { container } = render(<LanguageIcon name="Python" />)
        const icon = container.querySelector('i')
        expect(icon).toHaveClass('colored')
    })

    it('does not render colored class when color prop provided', () => {
        const { container } = render(<LanguageIcon name="Python" color="red" />)
        const icon = container.querySelector('i')
        expect(icon).not.toHaveClass('colored')
        expect(icon).toHaveStyle({ color: 'rgb(255, 0, 0)' })
    })
})
