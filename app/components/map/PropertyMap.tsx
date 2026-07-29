"use client";

import { useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_CONFIG } from "@/lib/maps/mapConfig";
import { MAP_THEMES } from "@/lib/maps/mapStyles";
import { ComparableMapProperty } from "@/lib/maps/comparableTypes";
import ComparableLayer from "./ComparableLayer";
import PropertyMarker from "./PropertyMarker";
import MapViewToolbar from "./view/MapViewToolbar";

interface Props{

    latitude:number;

    longitude:number;

    comparables?: ComparableMapProperty[];

}

export default function PropertyMap({

    latitude,

    longitude,

    comparables = []

}:Props){

    const [
        selectedStyle,
        setSelectedStyle
    ]=useState("street");

    const mapStyle =
        MAP_THEMES[
            selectedStyle as keyof typeof MAP_THEMES
        ] ?? MAP_CONFIG.style;

    return(

        <div className="relative h-[600px] w-full rounded-xl overflow-hidden border">

            <div className="absolute left-4 top-4 z-10">

                <MapViewToolbar

                    style={selectedStyle}

                    onStyleChange={setSelectedStyle}

                />

            </div>

            <Map

                initialViewState={{

                    latitude,

                    longitude,

                    zoom: MAP_CONFIG.defaultZoom,

                    bearing: MAP_CONFIG.bearing,

                    pitch: MAP_CONFIG.pitch

                }}

                mapStyle={mapStyle}

            >

                <NavigationControl position="top-right"/>

                <PropertyMarker

                    latitude={latitude}

                    longitude={longitude}

                />

                <ComparableLayer

                    comparables={comparables}

                />

            </Map>

        </div>

    );

}
