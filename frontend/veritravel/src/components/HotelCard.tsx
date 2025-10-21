import { MapPin, DollarSign, Star } from "lucide-react"

interface HotelCardProps {
  name: string
  price: number
  location: string
  rating?: number
  image?: string
}

export default function HotelCard({ name, price, location, rating = 4.5, image }: HotelCardProps) {
  return (
    <div className="bg-white rounded-3xl border-2 border-gray-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image Section */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-b-2 border-gray-300">
        {image ? (
          <img src={image || "/placeholder.svg"} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-2">🏨</div>
            <p className="text-sm">Hotel Image</p>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 text-balance">{name}</h3>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className="w-4 h-4 text-gray-600" />
          <span className="text-sm">{location}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            />
          ))}
          <span className="text-xs text-gray-600 ml-1">({rating})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-xl font-bold text-gray-900">{price}</span>
          <span className="text-sm text-gray-600">/night</span>
        </div>
      </div>
    </div>
  )
}
