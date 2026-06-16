import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useDirtyForm } from '../useDirtyForm'

interface ProfileState {
  name: string
  specializations: string[]
}

function setup(initial: ProfileState) {
  // Run inside an effect scope so onScopeDispose has a scope to attach to,
  // and skip the router/unload guards (no component instance in unit tests).
  const scope = effectScope()
  const state = ref<ProfileState>(initial)
  const form = scope.run(() => useDirtyForm(state, { guard: false }))!
  return { state, form, scope }
}

describe('useDirtyForm', () => {
  it('starts clean', () => {
    const { form } = setup({ name: 'Karina', specializations: ['lashes'] })
    expect(form.isDirty.value).toBe(false)
  })

  it('becomes dirty when a scalar field changes', () => {
    const { state, form } = setup({ name: 'Karina', specializations: [] })
    state.value.name = 'Karina Mi'
    expect(form.isDirty.value).toBe(true)
  })

  it('becomes dirty when an array field changes', () => {
    const { state, form } = setup({ name: 'Karina', specializations: ['lashes'] })
    state.value.specializations.push('makeup')
    expect(form.isDirty.value).toBe(true)
  })

  it('reset() adopts current values as the new clean snapshot', () => {
    const { state, form } = setup({ name: 'Karina', specializations: [] })
    state.value.name = 'Karina Mi'
    expect(form.isDirty.value).toBe(true)
    form.reset()
    expect(form.isDirty.value).toBe(false)
  })

  it('reset(values) adopts the passed values', () => {
    const { state, form } = setup({ name: 'Karina', specializations: [] })
    state.value.name = 'changed'
    form.reset({ name: 'fromServer', specializations: ['nails'] })
    expect(form.isDirty.value).toBe(true)
    state.value.name = 'fromServer'
    state.value.specializations = ['nails']
    expect(form.isDirty.value).toBe(false)
  })

  it('discard() reverts state back to the snapshot', () => {
    const { state, form } = setup({ name: 'Karina', specializations: ['lashes'] })
    state.value.name = 'Karina Mi'
    state.value.specializations.push('makeup')
    form.discard()
    expect(state.value.name).toBe('Karina')
    expect(state.value.specializations).toEqual(['lashes'])
    expect(form.isDirty.value).toBe(false)
  })

  it('snapshot is decoupled from the live state (deep clone)', () => {
    const { state, form } = setup({ name: 'Karina', specializations: ['lashes'] })
    // mutating the live array must not retroactively change the snapshot
    state.value.specializations.push('makeup')
    expect(form.isDirty.value).toBe(true)
    form.discard()
    state.value.specializations.push('brows')
    // after discard the snapshot still reflects the original single item
    form.discard()
    expect(state.value.specializations).toEqual(['lashes'])
  })
})
