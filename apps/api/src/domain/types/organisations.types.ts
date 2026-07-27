import { z } from "zod"

////////////////
// Organisationss
////////////////

// Core shared fields
const OrganisationCoreField = z.object({
    name: z.string("name must be a valid string"),
})

export const OrganisationSchema = OrganisationCoreField.extend({
    id: z.uuid("id must be a valid UUID"),
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
export const OrganisationCreateSchema = OrganisationCoreField.strict()

// For PATCH requests
export const OrganisationUpdateSchema = OrganisationCoreField
// .omit({"xxx": true, }) // field from OrganisationCoreField that should be be updatable by the users
.partial() // makes any of remaining fields optional
.strict() // disallows any unknows fields


//////////////////
// Type inference
//////////////////
export type Organisation = z.infer<typeof OrganisationSchema>;
export type OrganisationCreate = z.infer<typeof OrganisationCreateSchema>;
export type OrganisationUpdate = z.infer<typeof OrganisationUpdateSchema>;