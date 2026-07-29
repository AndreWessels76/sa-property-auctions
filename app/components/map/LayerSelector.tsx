export default function LayerSelector(){

    return(

        <div className="rounded-lg border bg-white p-4">

            <h3>

                Map Layers

            </h3>

            <label>

                <input type="checkbox" defaultChecked/>

                Comparables

            </label>

            <label>

                <input type="checkbox" defaultChecked/>

                Amenities

            </label>

            <label>

                <input type="checkbox"/>

                Traffic

            </label>

            <label>

                <input type="checkbox"/>

                Heat Map

            </label>

        </div>

    );

}
