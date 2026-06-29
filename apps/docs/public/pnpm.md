# Using PNPM in Turborepo

- adding a package to a specific workspace --> `pnpm add XYZ@X.X.X --filter=$WORKSPACE_NAME`
    - NOTE: use the $WORKSPACE_NAME from that package's `package.json`
- understand why we use a specifc version of a package --> `pnpm why $PACKAGE_NAME --filter=WORKSPACE_NAME`
- how to override a given package's sub-dependency version
    - for example we depend on a version of glob that has secuurity issues through tsoa package `tsoa 7.0.0-alpha.0 > @tsoa/cli 7.0.0-alpha.0 > glob 10.5.0`
    - add a section in the root `package.json` and override the version

```json
{
    "pnpm": {
        "overrides": {
            "glob": ">=11.0.0" 
        }
    }
}
```

- adding a internal package dependecy
    - `pnpm --filter <app-name> add <internal-pkg> --workspace`