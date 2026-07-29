import {

    ImportConnector,
    
    PropertyImportResult
    
    }
    
    from "../baseConnector";
    
    export class AbsaConnector
    
    implements ImportConnector{
    
        name="Absa";
    
        async import():
    
        Promise<PropertyImportResult>{
    
            return{
    
                success:true,
    
                properties:[],
    
                errors:[]
    
            };
    
        }
    
    }