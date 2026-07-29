import { z } from "zod"

////////////////
// Userss
////////////////

// Core shared fields
const UserCoreField = z.object({
    id: z.uuid("id must be a valid UUID"),
    first_name: z.string("first_name must be a valid string"),
    last_name: z.string("last_name must be a valid string"),
    email: z.email("email must be a valid, formating is xxx@yyy.zzz"),
})

export const UserSchema = UserCoreField.extend({
    created_at: z.iso.datetime({
        offset: true,
        message:"created_at must be a valid ISO timestamp"
    }),
    updated_at: z.iso.datetime({ 
        offset: true, 
        message: "updated_at must be a valid ISO timestamp" 
    })
})
.strict();


// For POST requests
export const UserCreateSchema = UserCoreField.strict()

// For PATCH requests
export const UserUpdateSchema = UserCoreField
.omit({"id": true, }) // field from UserCoreField that should be be updatable by the users
.partial() // makes any of remaining fields optional
.strict() // disallows any unknows fields


//////////////////
// Type inference
//////////////////
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;