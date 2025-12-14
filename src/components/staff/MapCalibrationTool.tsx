import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Wand2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { getClubCoordinates, getCountryCenter } from "@/lib/europeanCityCoordinates";

interface MapClub {
  id: string;
  club_name: string;
  country: string | null;
  x_position: number | null;
  y_position: number | null;
  latitude: number | null;
  longitude: number | null;
  is_calibration_point: boolean;
}

interface CalibrationPoint {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

interface MapCalibrationToolProps {
  clubs: MapClub[];
  onRefresh: () => void;
  selectedCountry: string;
}

export const MapCalibrationTool = ({ clubs, onRefresh, selectedCountry }: MapCalibrationToolProps) => {
  const [calibrating, setCalibrating] = useState(false);
  const [populatingCoords, setPopulatingCoords] = useState(false);

  // Get calibration stats per country
  const calibrationStats = useMemo(() => {
    const stats: Record<string, { total: number; calibrated: number; withLatLng: number }> = {};
    
    clubs.forEach(club => {
      const country = club.country || "Unknown";
      if (!stats[country]) {
        stats[country] = { total: 0, calibrated: 0, withLatLng: 0 };
      }
      stats[country].total++;
      if (club.is_calibration_point && club.x_position && club.y_position) {
        stats[country].calibrated++;
      }
      if (club.latitude && club.longitude) {
        stats[country].withLatLng++;
      }
    });
    
    return stats;
  }, [clubs]);

  // Get clubs for selected country
  const countryClubs = useMemo(() => {
    if (selectedCountry === "all") return clubs;
    return clubs.filter(c => c.country === selectedCountry);
  }, [clubs, selectedCountry]);

  const calibrationPoints = useMemo(() => {
    return countryClubs.filter(c => 
      c.is_calibration_point && 
      c.x_position !== null && 
      c.y_position !== null &&
      c.latitude !== null &&
      c.longitude !== null
    );
  }, [countryClubs]);

  const uncalibratedClubs = useMemo(() => {
    return countryClubs.filter(c => 
      !c.is_calibration_point &&
      c.latitude !== null &&
      c.longitude !== null
    );
  }, [countryClubs]);

  // Populate lat/lng coordinates for clubs that don't have them
  const handlePopulateCoordinates = async () => {
    setPopulatingCoords(true);
    try {
      const clubsToUpdate = clubs.filter(c => !c.latitude || !c.longitude);
      let updated = 0;
      
      for (const club of clubsToUpdate) {
        const coords = getClubCoordinates(club.club_name, club.country || "");
        if (coords) {
          const { error } = await supabase
            .from("club_map_positions")
            .update({ latitude: coords.lat, longitude: coords.lng })
            .eq("id", club.id);
          
          if (!error) updated++;
        }
      }
      
      toast.success(`Updated coordinates for ${updated} clubs`);
      onRefresh();
    } catch (error) {
      console.error("Error populating coordinates:", error);
      toast.error("Failed to populate coordinates");
    } finally {
      setPopulatingCoords(false);
    }
  };

  // Mark a manually-positioned club as a calibration point
  const handleMarkAsCalibrationPoint = async (clubId: string) => {
    try {
      const club = clubs.find(c => c.id === clubId);
      if (!club) return;

      // Get lat/lng if not already set
      let lat = club.latitude;
      let lng = club.longitude;
      
      if (!lat || !lng) {
        const coords = getClubCoordinates(club.club_name, club.country || "");
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          toast.error("Cannot find geographic coordinates for this club");
          return;
        }
      }

      const { error } = await supabase
        .from("club_map_positions")
        .update({ 
          is_calibration_point: true,
          latitude: lat,
          longitude: lng
        })
        .eq("id", clubId);
      
      if (error) throw error;
      toast.success(`${club.club_name} marked as calibration point`);
      onRefresh();
    } catch (error) {
      console.error("Error marking calibration point:", error);
      toast.error("Failed to mark calibration point");
    }
  };

  // Calculate affine transformation from calibration points
  const calculateTransformation = (points: CalibrationPoint[]) => {
    if (points.length < 3) return null;

    // Use least squares to find best fit transformation
    // [x]   [a b] [lng]   [e]
    // [y] = [c d] [lat] + [f]
    
    const n = points.length;
    let sumLng = 0, sumLat = 0, sumX = 0, sumY = 0;
    let sumLngLng = 0, sumLatLat = 0, sumLngLat = 0;
    let sumXLng = 0, sumXLat = 0, sumYLng = 0, sumYLat = 0;
    
    for (const p of points) {
      sumLng += p.lng;
      sumLat += p.lat;
      sumX += p.x;
      sumY += p.y;
      sumLngLng += p.lng * p.lng;
      sumLatLat += p.lat * p.lat;
      sumLngLat += p.lng * p.lat;
      sumXLng += p.x * p.lng;
      sumXLat += p.x * p.lat;
      sumYLng += p.y * p.lng;
      sumYLat += p.y * p.lat;
    }
    
    // Solve for transformation parameters
    const denom = n * sumLngLng * sumLatLat + 2 * sumLng * sumLat * sumLngLat 
                - sumLat * sumLat * sumLngLng - sumLng * sumLng * sumLatLat - n * sumLngLat * sumLngLat;
    
    if (Math.abs(denom) < 0.0001) {
      // Fallback to simpler linear interpolation if matrix is singular
      const minLng = Math.min(...points.map(p => p.lng));
      const maxLng = Math.max(...points.map(p => p.lng));
      const minLat = Math.min(...points.map(p => p.lat));
      const maxLat = Math.max(...points.map(p => p.lat));
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      
      return {
        transform: (lat: number, lng: number) => {
          const x = minX + (lng - minLng) / (maxLng - minLng) * (maxX - minX);
          const y = maxY - (lat - minLat) / (maxLat - minLat) * (maxY - minY); // Y is inverted
          return { x, y };
        }
      };
    }
    
    // Full affine transformation calculation
    // For simplicity, use a scale + translate approach based on bounding box
    const lngRange = Math.max(...points.map(p => p.lng)) - Math.min(...points.map(p => p.lng));
    const latRange = Math.max(...points.map(p => p.lat)) - Math.min(...points.map(p => p.lat));
    const xRange = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    const yRange = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
    
    const scaleX = lngRange > 0 ? xRange / lngRange : 1;
    const scaleY = latRange > 0 ? yRange / latRange : 1;
    
    const avgLng = sumLng / n;
    const avgLat = sumLat / n;
    const avgX = sumX / n;
    const avgY = sumY / n;
    
    return {
      transform: (lat: number, lng: number) => {
        const x = avgX + (lng - avgLng) * scaleX;
        const y = avgY - (lat - avgLat) * scaleY; // Y is inverted (higher lat = lower y)
        return { x, y };
      }
    };
  };

  // Apply calibration to uncalibrated clubs
  const handleApplyCalibration = async () => {
    if (calibrationPoints.length < 3) {
      toast.error("Need at least 3 calibration points. Position and mark more clubs as calibration points.");
      return;
    }

    setCalibrating(true);
    try {
      const points: CalibrationPoint[] = calibrationPoints.map(c => ({
        lat: c.latitude!,
        lng: c.longitude!,
        x: c.x_position!,
        y: c.y_position!
      }));

      const transformation = calculateTransformation(points);
      if (!transformation) {
        toast.error("Failed to calculate transformation");
        return;
      }

      let updated = 0;
      for (const club of uncalibratedClubs) {
        if (club.latitude && club.longitude) {
          const { x, y } = transformation.transform(club.latitude, club.longitude);
          
          // Add small random offset for same-city clubs
          const randomX = (Math.random() - 0.5) * 8;
          const randomY = (Math.random() - 0.5) * 8;
          
          const { error } = await supabase
            .from("club_map_positions")
            .update({
              x_position: Math.round((x + randomX) * 10) / 10,
              y_position: Math.round((y + randomY) * 10) / 10
            })
            .eq("id", club.id);
          
          if (!error) updated++;
        }
      }

      toast.success(`Calibrated ${updated} clubs in ${selectedCountry}`);
      onRefresh();
    } catch (error) {
      console.error("Error applying calibration:", error);
      toast.error("Failed to apply calibration");
    } finally {
      setCalibrating(false);
    }
  };

  const currentStats = selectedCountry === "all" 
    ? Object.values(calibrationStats).reduce(
        (acc, s) => ({ total: acc.total + s.total, calibrated: acc.calibrated + s.calibrated, withLatLng: acc.withLatLng + s.withLatLng }),
        { total: 0, calibrated: 0, withLatLng: 0 }
      )
    : calibrationStats[selectedCountry] || { total: 0, calibrated: 0, withLatLng: 0 };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Geo-Calibration Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {currentStats.total} clubs
          </Badge>
          <Badge variant={currentStats.calibrated >= 3 ? "default" : "secondary"} className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {currentStats.calibrated} calibration points
          </Badge>
          <Badge variant={currentStats.withLatLng > 0 ? "outline" : "destructive"} className="gap-1">
            {currentStats.withLatLng} with coordinates
          </Badge>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>How to calibrate:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Click "Populate Coordinates" to add lat/lng to clubs</li>
            <li>Drag 3-4 clubs per country to their correct positions on the map</li>
            <li>Mark those clubs as calibration points</li>
            <li>Click "Apply Calibration" to position remaining clubs</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePopulateCoordinates}
            disabled={populatingCoords}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${populatingCoords ? 'animate-spin' : ''}`} />
            Populate Coordinates
          </Button>
          
          {selectedCountry !== "all" && (
            <Button 
              size="sm"
              onClick={handleApplyCalibration}
              disabled={calibrating || calibrationPoints.length < 3}
            >
              <Wand2 className={`h-3 w-3 mr-1 ${calibrating ? 'animate-spin' : ''}`} />
              Apply Calibration ({uncalibratedClubs.length} clubs)
            </Button>
          )}
        </div>

        {/* Calibration points list */}
        {selectedCountry !== "all" && calibrationPoints.length > 0 && (
          <div className="text-xs">
            <p className="font-medium mb-1">Calibration points:</p>
            <div className="flex flex-wrap gap-1">
              {calibrationPoints.map(c => (
                <Badge key={c.id} variant="secondary" className="text-xs">
                  {c.club_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning if not enough calibration points */}
        {selectedCountry !== "all" && calibrationPoints.length < 3 && (
          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Need at least 3 calibration points for {selectedCountry}. 
              Position clubs on the map, save, then mark them as calibration points.
            </span>
          </div>
        )}

        {/* Per-country calibration status */}
        {selectedCountry === "all" && (
          <div className="text-xs space-y-1">
            <p className="font-medium">Countries ready for calibration:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(calibrationStats)
                .filter(([, s]) => s.calibrated >= 3)
                .map(([country]) => (
                  <Badge key={country} variant="default" className="text-xs">
                    {country}
                  </Badge>
                ))}
            </div>
            {Object.values(calibrationStats).filter(s => s.calibrated >= 3).length === 0 && (
              <p className="text-muted-foreground">No countries ready yet. Select a country and add calibration points.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
