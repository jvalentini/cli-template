import { Schema } from 'effect'

export const ItemSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
  completed: Schema.optional(Schema.Boolean),
})

export const CreateItemInput = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
})

export const UpdateItemInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200))),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
  completed: Schema.optional(Schema.Boolean),
})

export const EmailSchema = Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))

export const UsernameSchema = Schema.String.pipe(
  Schema.minLength(3),
  Schema.maxLength(30),
  Schema.pattern(/^[a-zA-Z0-9_-]+$/),
)

export type Item = Schema.Schema.Type<typeof ItemSchema>
export type CreateItemInput = Schema.Schema.Type<typeof CreateItemInput>
export type UpdateItemInput = Schema.Schema.Type<typeof UpdateItemInput>
