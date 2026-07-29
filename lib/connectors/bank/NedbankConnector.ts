import {

    ImportConnector,
    
    PropertyImportResult
    
    }
    
    from "../baseConnector";
    
    export class NedbankConnector
    
    implements ImportConnector{
    
        name="Nedbank";
    
        async import():
    
        Promise<PropertyImportResult>{
    
            return{
    
                success:true,
    
                properties:[],
    
                errors:[]
    
            };
    
        }
    
    }