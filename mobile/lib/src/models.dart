import 'dart:ui';

class Colorway {
  const Colorway({required this.name, required this.hex});

  final String name;
  final String hex;

  Color get color {
    final value = hex.replaceAll('#', '');
    return Color(int.parse('FF$value', radix: 16));
  }

  factory Colorway.fromJson(Map<String, dynamic> json) {
    return Colorway(name: json['name'] as String, hex: json['hex'] as String);
  }
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.gender,
    required this.category,
    required this.price,
    required this.rating,
    required this.reviews,
    required this.colors,
    required this.sizes,
    required this.images,
    required this.description,
    required this.fabric,
    required this.details,
    required this.stock,
    this.compareAt,
    this.trending = false,
    this.newest = false,
    this.bestseller = false,
    this.season,
  });

  final String id;
  final String name;
  final String gender;
  final String category;
  final double price;
  final double? compareAt;
  final double rating;
  final int reviews;
  final List<Colorway> colors;
  final List<String> sizes;
  final List<String> images;
  final String description;
  final String fabric;
  final List<String> details;
  final int stock;
  final bool trending;
  final bool newest;
  final bool bestseller;
  final String? season;

  bool get soldOut => stock <= 0;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      gender: json['gender'] as String,
      category: json['category'] as String,
      price: (json['price'] as num).toDouble(),
      compareAt: (json['compareAt'] as num?)?.toDouble(),
      rating: (json['rating'] as num).toDouble(),
      reviews: (json['reviews'] as num).toInt(),
      colors: (json['colors'] as List)
          .map(
            (item) => Colorway.fromJson(Map<String, dynamic>.from(item as Map)),
          )
          .toList(),
      sizes: (json['sizes'] as List).cast<String>(),
      images: (json['images'] as List).cast<String>(),
      description: json['description'] as String,
      fabric: json['fabric'] as String,
      details: (json['details'] as List).cast<String>(),
      stock: (json['stock'] as num).toInt(),
      trending: json['trending'] == true,
      newest: json['newest'] == true,
      bestseller: json['bestseller'] == true,
      season: json['season'] as String?,
    );
  }
}

class CartLine {
  CartLine({
    required this.productId,
    required this.size,
    required this.color,
    this.qty = 1,
  });

  final String productId;
  final String size;
  final String color;
  int qty;

  String get key => '$productId|$size|$color';

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'size': size,
    'color': color,
    'qty': qty,
  };

  factory CartLine.fromJson(Map<String, dynamic> json) {
    return CartLine(
      productId: json['productId'] as String,
      size: json['size'] as String,
      color: json['color'] as String,
      qty: (json['qty'] as num?)?.toInt() ?? 1,
    );
  }
}

class HouseOrder {
  const HouseOrder({
    required this.id,
    required this.placedAt,
    required this.items,
    required this.total,
    required this.method,
  });

  final String id;
  final String placedAt;
  final List<String> items;
  final double total;
  final String method;

  Map<String, dynamic> toJson() => {
    'id': id,
    'placedAt': placedAt,
    'items': items,
    'total': total,
    'method': method,
  };

  factory HouseOrder.fromJson(Map<String, dynamic> json) {
    return HouseOrder(
      id: json['id'] as String,
      placedAt: json['placedAt'] as String,
      items: (json['items'] as List).cast<String>(),
      total: (json['total'] as num).toDouble(),
      method: json['method'] as String,
    );
  }
}

String money(double value) => '\$${value.toStringAsFixed(2)}';

double discountFor(double subtotal, String? coupon) {
  if (subtotal <= 0 || coupon == null) return 0;
  if (coupon == 'AURELLE10') return (subtotal * 0.10 * 100).round() / 100;
  if (coupon == 'ATELIER25') return subtotal < 25 ? subtotal : 25;
  return 0;
}

double shippingFor(double subtotal, String method) {
  if (subtotal <= 0) return 0;
  if (method == 'express') return 28;
  if (method == 'atelier') return 45;
  return subtotal >= 150 ? 0 : 12;
}
