import { Controller, Route, Tags, Get } from "tsoa";

@Route("test")
@Tags("test")
export class BaseController extends Controller {
    /** Basic Get endoint to test out TSOA.  
    */
   @Get("/")
   public async getBase(): Promise<any> {
        return {"ok": true}
   }
}