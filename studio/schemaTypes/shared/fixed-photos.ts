import {defineArrayMember, defineField} from 'sanity'
import {optionalAltTextField} from './alt-text'

// The array actions to hide on a list whose layout is built for a set number
// of items: each item can still be edited (and, unless sorting is off, moved),
// but none added or removed.
export const FIXED_LENGTH = ['add', 'addBefore', 'addAfter', 'remove', 'duplicate'] as const

// A set of exactly `count` photos
export const fixedPhotosField = (count: number, description: string) =>
  defineField({
    name: 'images',
    title: 'Photos',
    type: 'array',
    description,
    of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: [optionalAltTextField]})],
    options: {layout: 'grid', disableActions: [...FIXED_LENGTH]},
    validation: (rule) => rule.required().length(count),
  })
