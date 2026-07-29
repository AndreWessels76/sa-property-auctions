import {

    ImportConnector,
    
    PropertyImportResult
    
    }
    
    from "../baseConnector";
    
    export class StandardBankConnector
    
    implements ImportConnector{
    
        name="Standard Bank";
    
        async import():
    
        Promise<PropertyImportResult>{
    
            return{
    
                success:true,
    
                properties:[],
    
                errors:[]
    
            };
    
        }
    
    }