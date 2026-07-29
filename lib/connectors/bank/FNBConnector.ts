import {

    ImportConnector,
    
    PropertyImportResult
    
    }
    
    from "../baseConnector";
    
    export class FNBConnector
    
    implements ImportConnector{
    
        name="FNB";
    
        async import():
    
        Promise<PropertyImportResult>{
    
            return{
    
                success:true,
    
                properties:[],
    
                errors:[]
    
            };
    
        }
    
    }