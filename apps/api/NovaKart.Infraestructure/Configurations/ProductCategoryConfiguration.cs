using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaKart.Domain.Entities;

namespace NovaKart.Infraestructure.Configurations
{
    public class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
    {
        public void Configure(EntityTypeBuilder<ProductCategory> builder)
        {
            builder.HasKey(pc => pc.Id);

            builder.Property(pc => pc.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(pc => pc.Name).IsUnique();
        }
    }
}
